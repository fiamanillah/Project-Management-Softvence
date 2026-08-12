import mongoose from "mongoose";

let isConnected = false;

export async function connectMongo(
  mongoUri: string,
): Promise<typeof mongoose> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    const db = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    return db;
  } catch (error) {
    isConnected = false;
    throw error;
  }
}

export async function disconnectMongo(): Promise<void> {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
  }
}
