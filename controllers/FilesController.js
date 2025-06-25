import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import mime from 'mime-types';
import dbClient from '../utils/db';
import fileQueue from '../utils/queue';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];

    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const key = `auth_${token}`;
      const userId = await redisClient.get(key);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const {
        name, type, parentId = 0, isPublic = false, data,
      } = req.body;

      if (!name) return res.status(400).json({ error: 'Missing name' });

      const acceptedTypes = ['folder', 'file', 'image'];
      if (!type || !acceptedTypes.includes(type)) {
        return res.status(400).json({ error: 'Missing type' });
      }

      if (!data && type !== 'folder') {
        return res.status(400).json({ error: 'Missing data' });
      }

      if (parentId !== 0) {
        const parentFile = await dbClient.db.collection('files').findOne({
          _id: new ObjectId(parentId),
        });

        if (!parentFile) return res.status(400).json({ error: 'Parent not found' });
        if (parentFile.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
      }

      const fileDocument = {
        userId: new ObjectId(userId),
        name,
        type,
        isPublic,
        parentId: parentId === 0 ? 0 : new ObjectId(parentId),
      };

      if (type === 'folder') {
        const result = await dbClient.db.collection('files').insertOne(fileDocument);
        return res.status(201).json({
          id: result.insertedId.toString(),
          userId,
          name,
          type,
          isPublic,
          parentId,
        });
      }

      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const localFilename = uuidv4();
      const localPath = path.join(folderPath, localFilename);

      const fileContent = Buffer.from(data, 'base64');
      fs.writeFileSync(localPath, fileContent);

      fileDocument.localPath = localPath;
      const result = await dbClient.db.collection('files').insertOne(fileDocument);

      // ✅ Add to Bull queue after inserting into DB
      if (type === 'image') {
        await fileQueue.add({
          userId,
          fileId: result.insertedId.toString(),
        });
      }

      return res.status(201).json({
        id: result.insertedId.toString(),
        userId,
        name,
        type,
        isPublic,
        parentId,
      });
    } catch (error) {
      console.error('Error in postUpload:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getShow(req, res) {
    const token = req.header('X-Token');
    const fileId = req.params.id;

    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const file = await dbClient.db.collection('files').findOne({
        _id: new ObjectId(fileId),
        userId: new ObjectId(userId),
      });

      if (!file) return res.status(404).json({ error: 'Not found' });

      return res.status(200).json({
        id: file._id.toString(),
        userId: file.userId.toString(),
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId === 0 ? 0 : file.parentId.toString(),
      });
    } catch (error) {
      return res.status(404).json({ error: 'Not found' });
    }
  }

  // 🔹 GET /files?parentId=...&page=...
  static async getIndex(req, res) {
    const token = req.header('X-Token');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parentId = req.query.parentId || '0';
    const page = Number.parseInt(req.query.page || '0', 10);
    const limit = 20;
    const skip = page * limit;

    const query = { userId: new ObjectId(userId) };
    query.parentId = parentId === '0' ? 0 : new ObjectId(parentId);

    try {
      const files = await dbClient.db
        .collection('files')
        .aggregate([{ $match: query }, { $skip: skip }, { $limit: limit }])
        .toArray();

      const result = files.map((file) => ({
        id: file._id.toString(),
        userId: file.userId.toString(),
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId === 0 ? 0 : file.parentId.toString(),
      }));

      return res.status(200).json(result);
    } catch (err) {
      console.error('Error in getIndex:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 🔹 PUT /files/:id/publish
  static async putPublish(req, res) {
    const token = req.header('X-Token');
    const fileId = req.params.id;

    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const file = await dbClient.db.collection('files').findOne({
        _id: new ObjectId(fileId),
        userId: new ObjectId(userId),
      });

      if (!file) return res.status(404).json({ error: 'Not found' });

      await dbClient.db
        .collection('files')
        .updateOne({ _id: new ObjectId(fileId) }, { $set: { isPublic: true } });

      return res.status(200).json({
        id: file._id.toString(),
        userId: file.userId.toString(),
        name: file.name,
        type: file.type,
        isPublic: true,
        parentId: file.parentId === 0 ? 0 : file.parentId.toString(),
      });
    } catch (err) {
      console.error('Error in putPublish:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 🔹 PUT /files/:id/unpublish
  static async putUnpublish(req, res) {
    const token = req.header('X-Token');
    const fileId = req.params.id;

    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const file = await dbClient.db.collection('files').findOne({
        _id: new ObjectId(fileId),
        userId: new ObjectId(userId),
      });

      if (!file) return res.status(404).json({ error: 'Not found' });

      await dbClient.db
        .collection('files')
        .updateOne(
          { _id: new ObjectId(fileId) },
          { $set: { isPublic: false } },
        );

      return res.status(200).json({
        id: file._id.toString(),
        userId: file.userId.toString(),
        name: file.name,
        type: file.type,
        isPublic: false,
        parentId: file.parentId === 0 ? 0 : file.parentId.toString(),
      });
    } catch (err) {
      console.error('Error in putUnpublish:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getFile(req, res) {
    const fileId = req.params.id;
    const token = req.header('X-Token') || null;
    const { size } = req.query;

    try {
      const file = await dbClient.db.collection('files').findOne({
        _id: new ObjectId(fileId),
      });

      if (!file) return res.status(404).json({ error: 'Not found' });

      const userId = token ? await redisClient.get(`auth_${token}`) : null;
      const isOwner = userId && file.userId.toString() === userId;

      if (!file.isPublic && !isOwner) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (file.type === 'folder') {
        return res.status(400).json({ error: 'A folder doesn\'t have content' });
      }

      let filePath = file.localPath;
      if (size && ['100', '250', '500'].includes(size)) {
        filePath = `${file.localPath}_${size}`;
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Not found' });
      }

      const mimeType = mime.lookup(file.name) || 'application/octet-stream';
      const fileContent = fs.readFileSync(filePath);

      res.setHeader('Content-Type', mimeType);
      return res.status(200).send(fileContent);
    } catch (error) {
      console.error('Error in getFile:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default FilesController;
