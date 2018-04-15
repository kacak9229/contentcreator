const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const JavLinkSchema = new Schema({
  link: String,
  jav_id: { type: String },
  process: { type: Boolean, default: false },
});

module.exports = mongoose.model('JavLink', JavLinkSchema);
