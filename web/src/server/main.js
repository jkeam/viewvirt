import express from 'express';
import ViteExpress from 'vite-express';
import fetch from 'node-fetch';
import 'dotenv/config';

const API_BASE_URL = process.env.API_BASE_URL;

const app = express();

const baseGet = async (path) => {
  try {
    const url = `${API_BASE_URL}${path}`;
    const options = {
      method: 'GET'
    };
    const callResponse = await fetch(url, options);
    const json = await callResponse.json();
    return json;
  } catch (err) {
    console.error(err);
  }
};

const basePost = async (path) => {
  try {
    const url = `${API_BASE_URL}${path}`;
    const options = {
      method: 'POST'
    };
    const callResponse = await fetch(url, options);
    const json = await callResponse.json();
    return json;
  } catch (err) {
    console.error(err);
  }
};

app.get("/api/healthz", (req, res) => {
  res.json({"status": "alive"});
});

app.get("/api/vms", async (req, res) => {
  const json = await baseGet("/vms");
  res.json(json);
});

app.get("/api/hosts", async (req, res) => {
  const json = await baseGet("/hosts");
  res.json(json);
});

app.get("/api/storages", async (req, res) => {
  const json = await baseGet("/storages");
  res.json(json);
});

app.get("/api/vmnamespaces", async (req, res) => {
  const json = await baseGet("/vmnamespaces");
  res.json(json);
});

app.post("/api/vms/:namespace/:name/start", async (req, res) => {
  const { namespace, name } = req.params;
  const json = await basePost(`/vms/${namespace}/${name}/start`);
  res.json(json);
});

app.post("/api/vms/:namespace/:name/stop", async (req, res) => {
  const { namespace, name } = req.params;
  const json = await basePost(`/vms/${namespace}/${name}/stop`);
  res.json(json);
});

app.post("/api/vms/:namespace/:name/restart", async (req, res) => {
  const { namespace, name } = req.params;
  const json = await basePost(`/vms/${namespace}/${name}/restart`);
  res.json(json);
});

ViteExpress.listen(app, 3000, () =>
  console.log("Server is listening on port 3000..."),
);
