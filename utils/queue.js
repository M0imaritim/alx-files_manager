import Bull from 'bull';

const fileQueue = new Bull('fileQueue');
const userQueue = new Bull('userQueue'); // new

export { fileQueue, userQueue };
export default fileQueue;
