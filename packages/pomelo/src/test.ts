import * as fs from "fs";
import { Encrypt } from "./encrypt";

const encrypt = new Encrypt("aes-256-cfb", "welcome");

fs.createReadStream("./ss-server.ts")
.pipe(encrypt.createCipheriv())
.pipe(encrypt.createDecipheriv())
.pipe(process.stdout);
