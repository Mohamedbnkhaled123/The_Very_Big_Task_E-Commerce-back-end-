//user controller.js
const User = require("../models/user.model.js");
exports.createUser =  (role)=>{
    return async (req,res) =>{
        const {name , email , phoneNumbers, addresses, password ,role } = req.body;
        const myUser = await User.create({name , email , phoneNumbers, addresses, password , role});
        res.status(201).json(myUser);
    }
   
}
exports.getUsers =  async (req,res)=>{
    const users = await User.find();
    res.status(200).json({message:'user List',data:users});
}
