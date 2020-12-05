const path = require("path");
const fs = require("fs").promises;
const multer = require("multer");
const upload = multer({
  dest: path.join(__dirname, "..", "tmp_upload"),
  fileFilter: function (req, file, cb) {
    if (
      ["image/png", "image/jpeg", "image/gif"].indexOf(file.mimetype) === -1
    ) {
      return cb(new multer.MulterError("Wrong mimetype"));
    } else {
      cb(null, true);
    }
  },
  limits: {
    fileSize: 1024 * 1024 * 2,
  },
}).array("gallery", 5);

const cloudinary = require("cloudinary").v2;
cloudinary.config({
  api_key: "486491292758638",
  api_secret: "V09vhr9OOqkmV4SDDEyM8lf3GDc",
  cloud_name: "dqwgxcnh7",
});

const router = require("express").Router();

router.use(function (req, res, next) {
  if (!(req.user && req.user.isAdmin)) {
    res.status(404).json({ error: "Forbidden" });
  }
  else{
    next();
  }
});

router.get("/", function (req, res) {
  const next_cursor = req.query.next_cursor;
  const max_results = 10;
  cloudinary.api
    .resources({ type: "upload", next_cursor, max_results, prefix: "store/" })
    .then(function (result) {
      res.json(result);
    })
    .catch(function () {
      res.json({ error: "Can't acccess files" });
    });
});

router.post("/upload", function (req, res) {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      res.status(404).json({ error: "Error: " + err.code });
    } else {
      if (req.files.length > 0) {
        const uploadPromises = [];
        const deletePromises = [];
        for (const file of req.files) {
          uploadPromises.push(
            cloudinary.uploader.upload(file.path, { folder: "store" })
          );
          deletePromises.push(fs.unlink(file.path));
        }

        Promise.all(uploadPromises)
          .then((result) => {
            res.json({
              result: result.map(({ public_id, secure_url }) => ({
                public_id,
                secure_url,
              })),
            });
            return Promise.all(deletePromises);
          })
          .then(() => {
            console.log("The file was deleted");
          })
          .catch((err) => {
            res.status(404).json({
              error: "Upload Error",
            });
          });
      } else {
        res.status(404).json({
          error: "File's not found",
        });
      }
    }
  });
});

router.post("/delete", function (req, res) {
  if (req.body.public_ids) {
    const deletePromises = [];
    for (const item of req.body.public_ids) {
      deletePromises.push(cloudinary.uploader.destroy(item.public_id));
    }

    Promise.all(deletePromises)
      .then((result) => {
        res.json(result);
      })
      .catch(() =>
        res.status(404).json({
          error: "Delete Error",
        })
      );
  } else {
    res.status(404).json({
      error: "File's not found",
    });
  }
});

module.exports = router;
