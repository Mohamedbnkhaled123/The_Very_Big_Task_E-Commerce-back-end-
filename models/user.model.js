//models/user.model.js
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const AddressSchema = require("./address.model");
const CartItemSchema = require("./cart.model");


const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phoneNumbers: [{ type: String, trim: true, required:true }], 
  addresses: [{type:AddressSchema ,required:true}],                   
  cart: [{type:CartItemSchema ,required:true}],                       
  isActive: { type: Boolean, default: true },
  canPurchase: { type: Boolean, default: true },
  lastActiveAt: { type: Date, default: Date.now },
  role: {
    type: String,
    enum: ["user", "admin", "superadmin"],
    default: "user"         
  },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date }
},
  { timestamps: true });



  //db Functions models
userSchema.pre("save", async function () {
    if (this.role) {
        this.role = this.role.toLowerCase();
    }
});

userSchema.pre("save",async function(){
if (!this.isModified('password'))return ;
this.password = await bcrypt.hash(this.password,12);
})
  userSchema.methods.correctPassword = async function(inputPassword){
    return await bcrypt.compare(inputPassword,this.password);
  }
    
module.exports = mongoose.model("User",userSchema);