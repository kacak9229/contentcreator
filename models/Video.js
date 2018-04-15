const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VideoSchema = new Schema({
  title: String,
  jav_id: { type: String },
  release_date: String,
  director: String,
  maker: String,
  casts: [String],
  genres: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
  length: Number,
  image: String,
  video_sources: [String],
  preview_url: String,
  preview_video_url: String,
  likes: Number,
  dislikes: Number,
  future_release: { type: Boolean, default: false}
});

module.exports = mongoose.model('Video', VideoSchema);
