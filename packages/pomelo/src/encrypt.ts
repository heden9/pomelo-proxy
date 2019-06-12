import * as crypto from "crypto";
import { Duplex, Transform } from "stream";

export interface IEncrypt {
  createCipheriv(): Duplex;
  createDecipheriv(): Duplex;
}

export interface IEncryptClass {
  support: {
    [key: string]: [number, number];
  };
  new (method: string, password: string): IEncrypt;
}

export class Encrypt implements IEncrypt {
  public static support: IEncryptClass["support"] = {
    "aes-128-cbc": [16, 16],
    "aes-192-cbc": [24, 16],
    "aes-256-cbc": [32, 16],
    "aes-128-cfb": [16, 16],
    "aes-192-cfb": [24, 16],
    "aes-256-cfb": [32, 16],
    "aes-128-ofb": [16, 16],
    "aes-192-ofb": [24, 16],
    "aes-256-ofb": [32, 16],
    "aes-128-ctr": [16, 16],
    "aes-192-ctr": [24, 16],
    "aes-256-ctr": [32, 16],
    "aes-128-cfb8": [16, 16],
    "aes-192-cfb8": [24, 16],
    "aes-256-cfb8": [32, 16],
    "aes-128-cfb1": [16, 16],
    "aes-192-cfb1": [24, 16],
    "aes-256-cfb1": [32, 16],
    "bf-cfb": [16, 8],
    "camellia-128-cfb": [16, 16],
    "camellia-192-cfb": [24, 16],
    "camellia-256-cfb": [32, 16],
    "cast5-cfb": [16, 8],
    "des-cfb": [8, 8],
    "idea-cfb": [16, 8],
    "rc2-cfb": [16, 8],
    "rc4": [16, 0],
    "seed-cfb": [16, 16],
    "aes-128-gcm": [16, 16],
    "aes-192-gcm": [24, 24],
    "aes-256-gcm": [32, 32],
    "aes-128-ocb": [16, 16],
    "aes-192-ocb": [24, 24],
    "aes-256-ocb": [32, 32],
  };

  public static BYTES_TO_KEY_CACHE: {
    [key: string]: [Buffer, Buffer];
  } = {};

  public static EVP_BytesToKey(
    password: string,
    keyLen: number,
    ivLen: number,
  ) {
    const cachedKey = `${password}-${keyLen}-${ivLen}`;
    const keyIvTuple = Encrypt.BYTES_TO_KEY_CACHE[cachedKey];
    if (keyIvTuple) {
      return keyIvTuple;
    }

    let i = 0;
    const m = [];
    const passwordBuf = Buffer.from(password, "binary");
    while (Buffer.concat(m).length < keyLen + ivLen) {
      const md5 = crypto.createHash("md5");
      let data = passwordBuf;
      if (i > 0) {
        data = Buffer.concat([m[i - 1], passwordBuf]);
      }
      md5.update(data);
      m.push(md5.digest());
      i += 1;
    }
    const ms = Buffer.concat(m);
    const key = ms.slice(0, keyLen);
    const iv = ms.slice(keyLen, keyLen + ivLen);
    Encrypt.BYTES_TO_KEY_CACHE[cachedKey] = [key, iv];
    return [key, iv];
  }

  private _method: string;
  private _password: string;
  private _key: Buffer;
  private _ivCipher: Buffer;
  private _ivDecipher: Buffer | null = null;
  private _keyLen: number;
  private _ivLen: number;
  private _ivSent: boolean = false;
  constructor(method: string, password: string) {
    this._method = method.toLowerCase();
    this._password = password;

    const tuple = Encrypt.support[this._method];
    if (!tuple) {
      throw new Error("not support method");
    }
    this._keyLen = tuple[0];
    this._ivLen = tuple[1];

    const [key, iv] = this.EVP_BytesToKey();
    this._key = key;
    this._ivCipher = iv.slice(0, this._keyLen);
  }

  public EVP_BytesToKey() {
    return Encrypt.EVP_BytesToKey(this._password, this._keyLen, this._ivLen);
  }

  public createCipheriv(): Duplex {
    const cipheriv = crypto.createCipheriv(
      this._method,
      this._key,
      this._ivCipher,
    );
    // append iv
    if (!this._ivSent) {
      this._ivSent = true;
      cipheriv.push(this._ivCipher);
    }
    return cipheriv;
  }

  public createDecipheriv(): Duplex {
    // create Decipheriv directly
    if (this._ivDecipher) {
      return crypto.createDecipheriv(this._method, this._key, this._ivDecipher);
    }

    const self = this;
    const pipes: Parameters<typeof transform.pipe>[] = [];

    let decipheriv: crypto.Decipher;
    const fnPipe = Transform.prototype.pipe;
    const fnUnpipe = Transform.prototype.unpipe;
    const transform = new Transform({
      transform(chunk, encoding, callback) {
        if (
          self._ivDecipher ||
          (!self._ivDecipher && chunk.length < self._ivLen)
        ) {
          callback(null, chunk);
          return;
        }
        // enter once, get iv
        const ivDecipher = (self._ivDecipher = chunk.slice(0, self._ivLen));
        decipheriv = crypto.createDecipheriv(
          self._method,
          self._key,
          ivDecipher,
        );
        fnPipe.call(transform, decipheriv);
        // pipe saved dest
        for (const args of pipes) {
          decipheriv.pipe(...args);
        }
        // reset
        (transform as any).pipe = (des: any, option: any) => {
          decipheriv.pipe(des, option);
          return des;
        };
        (transform as any).unpipe = (...args: any[]) => {
          decipheriv.unpipe(...args);
          return transform;
        };
        callback(null, chunk.slice(self._ivLen));
      },
    });
    // rewrite pipe/unpipe
    (transform as any).pipe = (...args: Parameters<typeof transform.pipe>) => {
      // save pipeOpts to array
      pipes.push(args);
      return args[0];
    };
    (transform as any).unpipe = (
      ...args: Parameters<typeof transform.unpipe>
    ) => {
      // delete elem from array
      for (let index = 0; index < pipes.length; index++) {
        const [destination] = pipes[index];
        if (destination === args[0]) {
          pipes.splice(index, 1);


          break;
        }
      }

      return transform;
    };
    return transform;
  }
}
