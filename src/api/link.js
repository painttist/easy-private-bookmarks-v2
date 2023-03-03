import { apiVersions, LATEST_API_VERSION } from './api'
import { b64 } from './b64'

export async function generateFragment(url, passwd, hint, useRandomSalt, useRandomIv) {
  const api = apiVersions[LATEST_API_VERSION];

  const salt = useRandomSalt ? await api.randomSalt() : null;
  const iv = useRandomIv ? await api.randomIv() : null;
  const encrypted = await api.encrypt(url, passwd, salt, iv);
  const output = {
    v: LATEST_API_VERSION,
    e: b64.binaryToBase64(new Uint8Array(encrypted))
  }

  // Add the hint if there is one
  if (hint != "") {
    output["h"] = hint;
  }

  // Add the salt and/or initialization vector if randomly generated
  if (useRandomSalt) {
    output["s"] = b64.binaryToBase64(salt);
  }
  if (useRandomIv) {
    output["i"] = b64.binaryToBase64(iv);
  }

  // Return the base64-encoded output
  return b64.encode(JSON.stringify(output));
}

const error = (reason) => {throw new Error(reason); }

export async function decryptFragment(urlText, password) {

  let url;
  try {
    url = new URL(urlText);
  } catch {
    error("Entered text is not a valid URL. Make sure it includes \"https://\" too!");
    return;
  }

  let params;
  try {
    params = JSON.parse(b64.decode(url.hash.slice(1)));
  } catch {
    error("The link appears corrupted.");
    return;
  }

  // Check that all required parameters encoded in the URL are present
  if (!("v" in params && "e" in params)) {
    error("The link appears corrupted. The encoded URL is missing necessary parameters.");
    return;
  }

  // Check that the version in the parameters is valid
  if (!(params["v"] in apiVersions)) {
    error("Unsupported API version. The link may be corrupted.");
    return;
  }

  const api = apiVersions[params["v"]];

  // Get values for decryption
  const encrypted = b64.base64ToBinary(params["e"]);
  const salt = "s" in params ? b64.base64ToBinary(params["s"]) : null;
  const iv = "i" in params ? b64.base64ToBinary(params["i"]) : null;
  const hint = "h" in params && params["h"] ? params["h"] : null;

  // Decrypt if possible
  let decrypted;
  try {
    decrypted = await api.decrypt(encrypted, password, salt, iv);
  } catch {
    error("Incorrect password!");
    return;
  }

  return { decrypted, hint };

}