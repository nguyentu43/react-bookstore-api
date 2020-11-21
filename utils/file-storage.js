const path = require("path");
const fs = require("fs").promises;
const multer = require("multer");
const imageMulter = multer({
    dest: path.join(__dirname, "..","upload_tmp")
});

const cloudinary = require("cloudinary").v2;
cloudinary.config({
    api_key: "486491292758638",
    api_secret: "V09vhr9OOqkmV4SDDEyM8lf3GDc",
    cloud_name: "dqwgxcnh7"
});

module.exports = function(sequelize){
    const { checkAdmin } = require("../utils/auth")(sequelize);
    const router = require("express").Router();
    router.post("/upload", imageMulter.single("image"), function(req, res){
        checkAdmin(req);
        if(req.file){

            cloudinary.uploader.upload(req.file.path)
            .then(result => {
                res.json({ public_id: result.public_id });
                return fs.unlink(req.file.path);
            })
            .then(() => {
                console.log("The file was deleted");
            })
            .catch(err => {
                return res.json({
                    error: "Can't run this action"
                })
            });
            
        }
        else {
            res.json({
                error: "Can't run this action"
            });
        }
    });
    router.post("/delete/:public_id", function(req, res){

        checkAdmin(req);
        if(req.params.public_id){
            cloudinary.uploader.destroy(req.params.public_id).then(result => {
                res.json(result);
            })
            .catch(err => (res.json({
                error: "Can't run this action"
            })));
        }
        else{
            res.json({
                error: "Can't run this action"
            });
        }
        
    });
    return router;
}