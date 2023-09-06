const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const archiver = require("archiver");
const AdmZip = require("adm-zip");
const path = require("path");
const fsExtra = require("fs-extra");
const checkAuthentication = require("../middleware");
const db = require("../app");
const extractPath = "uploads/extracted/";

/* upload .sb3 file */

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/projects/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });
router.post(
  "/upload",
  upload.single("file"),
  checkAuthentication,
  async (req, res) => {
    console.log(req.user.id);

    try {
      const filePath = path.join(__dirname, "../", req.file.path);
      const outputDir = path.join(__dirname, "../", extractPath);
      const zip = new AdmZip(filePath);
      zip.extractAllTo(outputDir);
      console.log("Extraction complete");

      const svgFolderPath = outputDir; // Update with your folder path
      try {
        console.log(svgFolderPath);
        const files = await fs.promises.readdir(svgFolderPath);

        let largestSize = 0;
        let largestFileName = "";

        for (const file of files) {
          const filePath = path.join(svgFolderPath, file);
          const stat = await fs.promises.stat(filePath);

          if (stat.isFile() && path.extname(filePath) === ".svg") {
            if (stat.size > largestSize) {
              largestSize = stat.size;
              largestFileName = file;
            }
          }
        }
        const iconname = path.join("uploads/images/", largestFileName);
        const projectPath = req.file.path.replace(/\\/g, "/");
        const iconPath = iconname.replace(/\\/g, "/");
        const currentPath = path.join("uploads/extracted/", largestFileName);
        await fs.promises.copyFile(currentPath, iconPath);
        const savename = req.file.filename.split(".")[0];
        db.query(
          "INSERT INTO files (type, userid, path, icon, name, description) VALUES (?, ?, ?, ?, ?, ?)",
          [
            "project",
            req.user.id,
            `${projectPath}`,
            `${iconPath}`,
            savename,
            savename,
          ],
          (error, results) => {
            if (error) {
              console.error(error);
            } else {
              console.log("Project file inserted");
            }
          }
        );
        console.log("project insert");
      } catch (err) {
        console.error(err);
        res
          .status(500)
          .json({
            error: "An error occurred while searching for the largest SVG file",
          });
      }

      const projectJson = JSON.parse(
        await fs.promises.readFile(
          path.join(extractPath, "project.json"),
          "utf-8"
        )
      );

      // Extract the sprites and save them as .sprite files
      for (const target of projectJson.targets) {
        if (target.isStage) continue;

        const file_name = target.name;
        const spriteData = JSON.stringify(target);
        const sanitizedStr = file_name.replace(/[^\w\s.-]/gi, "");
        const trimmedStr = sanitizedStr.replace(/\s+/g, " ");
        const finalfileName = trimmedStr.trim();
        const spritename = req.user.id + "_" + finalfileName;
        const output = fs.createWriteStream(
          `uploads/sprites/${spritename}.sprite3`
        );

        const archive = archiver("zip", {
          zlib: { level: 9 }, // Compression level
        });

        output.on("close", () => {
          console.log("Archive created:", archive.pointer() + " total bytes");
        });

        archive.on("warning", (err) => {
          if (err.code === "ENOENT") {
            console.warn("Stat warning:", err);
          } else {
            throw err;
          }
        });

        archive.on("error", (err) => {
          throw err;
        });

        archive.pipe(output);

        const files = await fs.promises.readdir(outputDir);
        for (const file of files) {
          const filePath = `${outputDir}/${file}`;
          archive.file(filePath, { name: file });
        }

        archive.append(spriteData, { name: "sprite.json" });
        await archive.finalize();

        const costumes = target.costumes;
        let largestSize = 0;
        let largestFileName = "";
        for (let i = 0; i < costumes.length; i++) {
          const costume = costumes[i];
          const filePath = `uploads/extracted/${costume.md5ext}`;
          const stat = await fs.promises.stat(filePath);
          // console.log(sta)
          if (
            stat.isFile() &&
            (path.extname(filePath) === ".svg" ||
              path.extname(filePath) === ".png")
          ) {
            if (stat.size > largestSize) {
              largestSize = stat.size;
              largestFileName = costume.md5ext;
            }
          }
        }
        const currentPath = `uploads/extracted/${largestFileName}`;
        const destinationPath = `uploads/images/${largestFileName}`;
        const SVURL = process.env.SERVER_URL;
        console.log(SVURL);
        await fs.promises.copyFile(currentPath, destinationPath);
        db.query(
          "INSERT INTO files (type, userid, path, icon, name, description) VALUES (?, ?, ?, ?, ?, ?)",
          [
            "sprite",
            req.user.id,
            `uploads/sprites/${spritename}.sprite3`,
            `${destinationPath}`,
            finalfileName,
            finalfileName,
          ],
          (error, results) => {
            if (error) {
              console.error(error);
            } else {
              console.log("Project file inserted");
            }
          }
        );
      }

      // Clear the extract folder after creating the zip file
      await fsExtra.emptyDir(extractPath);
      console.log("Extract folder cleared");

      res.status(200).json({ message: "File extracted successfully" });
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: "An error occurred during extraction" });
    }
  }
);

/* upload sprite file */

const storage2 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/sprites/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload_sprite = multer({ storage: storage2 });
router.post(
  "/upload_sprite",
  upload_sprite.single("file"),
  checkAuthentication,
  async (req, res) => {
    const filePath = path.join(__dirname, "../", req.file.path);
    const outputDir = path.join(__dirname, "../", extractPath);
    const zip = new AdmZip(filePath);
    zip.extractAllTo(outputDir);
    console.log("Extraction complete");
    const svgFolderPath = outputDir; // Update with your folder path
    try {
      console.log(svgFolderPath);
      const files = await fs.promises.readdir(svgFolderPath);

      let largestSize = 0;
      let largestFileName = "";

      for (const file of files) {
        const filePath = path.join(svgFolderPath, file);
        const stat = await fs.promises.stat(filePath);

        if (
          stat.isFile() &&
          (path.extname(filePath) === ".svg" ||
            path.extname(filePath) === ".png")
        ) {
          if (stat.size > largestSize) {
            largestSize = stat.size;
            largestFileName = file;
          }
        }
      }
      const iconname = path.join("uploads/images/", largestFileName);
      const URL = process.env.SERVER_URL;
      const projectPath = req.file.path.replace(/\\/g, "/");
      const iconPath = iconname.replace(/\\/g, "/");
      const currentPath = path.join("uploads/extracted/", largestFileName);
      await fs.promises.copyFile(currentPath, iconPath);
      const savename = req.file.filename.split(".")[0];
      db.query(
        "INSERT INTO files (type, userid, path, icon, name, description) VALUES (?, ?, ?, ?, ?, ?)",
        [
          "sprite",
          req.user.id,
          `${projectPath}`,
          `${iconPath}`,
          savename,
          savename,
        ],
        (error, results) => {
          if (error) {
            console.error(error);
          } else {
            console.log("Sprite file inserted");
          }
        }
      );
      console.log("Sprite insert");
      res.send("Success");
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({
          error: "An error occurred while searching for the largest SVG file",
        });
    }
  }
);

router.post("/get_popular_project", (req, res) => {
  const searchtext = req.body.searchtext;
  db.query(
    `SELECT * FROM files WHERE type = 'project' AND description LIKE '%${searchtext}%' `,
    (err, results) => {
      if (err) {
        res.status(500).json({ error: "Error fetching users" });
        return;
      }
      res.json(results);
    }
  );
});

router.post("/get_popular_sprite", (req, res) => {
  const searchtext = req.body.searchtext;
  db.query(
    `SELECT * FROM files WHERE type = 'sprite' AND description LIKE '%${searchtext}%' `,
    (err, results) => {
      if (err) {
        res.status(500).json({ error: "Error fetching users" });
        return;
      }
      res.json(results);
    }
  );
});

router.post("/get_own_project", checkAuthentication, (req, res) => {
  const searchtext = req.body.searchtext;
  db.query(
    `SELECT * FROM files WHERE type = 'project' AND userid = ${req.user.id} AND description LIKE '%${searchtext}%'`,
    (err, results) => {
      if (err) {
        res.status(500).json({ error: "Error fetching users" });
        return;
      }
      // console.log(results)
      res.json(results);
    }
  );
});

router.post("/get_own_sprite", checkAuthentication, (req, res) => {
  const searchtext = req.body.searchtext;
  db.query(
    `SELECT * FROM files WHERE type = 'sprite' AND userid = ${req.user.id} AND description LIKE '%${searchtext}%'`,
    (err, results) => {
      if (err) {
        res.status(500).json({ error: "Error fetching users" });
        return;
      }
      // console.log(results)
      res.json(results);
    }
  );
});

router.post("/delete", checkAuthentication, (req, res) => {
  fileid = req.body.fileid;
  db.query(`DELETE from files WHERE id = ${fileid}`, (err, results) => {
    if (err) {
      res.status(500).json({ error: "Error Editing" });
      return;
    }
    res.send("Delete Success");
  });
});

router.post("/edit", checkAuthentication, (req, res) => {
  var { fileid, filename, filetext } = req.body;
  db.query(
    `UPDATE files SET name = ? AND description = ? WHERE id = ?`,
    [filename, filetext, fileid],
    (err, results) => {
      if (err) {
        res.status(500).json({ error: "Error Updating fileName" });
        return;
      }
      res.send("Update Success");
    }
  );
});

module.exports = router;
