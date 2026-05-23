import mongoose from 'mongoose';

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('⚠️  MONGODB_URI is not set. Skipping MongoDB connection for now.');
    return false;
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ MongoDB connected');
    return true;
  } catch (error) {
    console.warn('⚠️  MongoDB connection failed. Backend will continue without database access.');
    console.warn(error);
    return false;
  }
};

export default connectDB;