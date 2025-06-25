import { ObjectId } from 'mongodb';
import fs from 'fs';
import imageThumbnail from 'image-thumbnail';
import dbClient from './utils/db';
import fileQueue from './utils/queue';

fileQueue.process(async (job, done) => {
  const { fileId, userId } = job.data;

  if (!fileId) throw new Error('Missing fileId');
  if (!userId) throw new Error('Missing userId');

  try {
    const file = await dbClient.db.collection('files').findOne({
      _id: new ObjectId(fileId),
      userId: new ObjectId(userId),
    });

    if (!file) throw new Error('File not found');
    if (file.type !== 'image') throw new Error('Not an image');
    if (!file.localPath || !fs.existsSync(file.localPath)) {
      throw new Error('Local file not found');
    }

    const sizes = [500, 250, 100];
    for (const size of sizes) {
      const options = { width: size };
      const thumbnail = await imageThumbnail(file.localPath, options);
      const newPath = `${file.localPath}_${size}`;
      fs.writeFileSync(newPath, thumbnail);
    }

    done();
  } catch (err) {
    console.error('Worker error:', err);
    done(err);
  }
});
