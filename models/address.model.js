//address model.js
const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
  title: { type: String, required: true }, 
  city: { type: String, required: true },
  street: { type: String, required: true },
  buildingNumber: String,
  floorNumber: String
});
module.exports = AddressSchema;