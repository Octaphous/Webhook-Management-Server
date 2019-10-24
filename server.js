const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const childProcess = require("child_process");
const webhooks = require("./webhooks.json");
const config = require("./config.json");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.post("/", (req, res) => {
    let branch = req.body.ref ? req.body.ref.split("/")[req.body.ref.split("/").length - 1] : undefined;
    req.on("data", chunk => {
        webhooks.forEach(webhook => {
            if (webhook.rules.event && webhook.rules.event != req.headers["x-github-event"]) return;
            if (webhook.rules.repository && webhook.rules.repository != req.body.repository.name) return;
            if (webhook.rules.pusher && webhook.rules.pusher != req.body.pusher.name) return;
            if (webhook.rules.branch && webhook.rules.branch != branch) return;
            if (webhook.rules.secret) {
                let sig = "sha1=" + crypto.createHmac("sha1", webhook.rules.secret).update(chunk.toString()).digest("hex");
                
                if (req.headers["x-hub-signature"] != sig)
                    return;
            }

            let command = `cd ${webhook.directory} && ${webhook.command}`;
            childProcess.exec(command, (err, stdout) => {
                if (err) throw err;
                console.log(stdout);
            });
        });
    });
});

app.listen(config.http_port, () => console.log("Server open on port " + config.http_port));