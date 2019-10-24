const express = require("express");
const crypto = require("crypto");
const childProcess = require("child_process");
const webhooks = require("./webhooks.json");
const config = require("./config.json");

const app = express();

app.post("/", (req, res) => {
    req.on("data", chunk => {
        let body = JSON.parse(chunk);
        let branch = body.ref ? body.ref.split("/")[body.ref.split("/").length - 1] : undefined;
        webhooks.forEach(webhook => {
            if (webhook.rules.event && webhook.rules.event != req.headers["x-github-event"]) return;
            if (webhook.rules.repository && webhook.rules.repository != body.repository.name) return;
            if (webhook.rules.pusher && webhook.rules.pusher != body.pusher.name) return;
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
    res.end();
});

app.listen(config.http_port, () => console.log("Server open on port " + config.http_port));