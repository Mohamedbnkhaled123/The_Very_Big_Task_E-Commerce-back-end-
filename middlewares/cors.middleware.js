const cors = require("cors");

const corsOptions = {
  origin: true, // Dynamically reflects the request origin (Access-Control-Allow-Origin)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

module.exports = cors(corsOptions);


// {
//   origin: (orgin, cb) => {
//     // process.env.allowedOrigins.split(",").includes(orgin)
//     if (!orgin) return cb(null, false);

//     if (orgin == "http://localhost:4200") {
//       cb(null, true)
//     } else {
//       cb(new Error("Access denied"), false)
//     }
//   }
// }
