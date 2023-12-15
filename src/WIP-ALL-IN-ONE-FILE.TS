import { connect as connectTcp, Socket, NetConnectOpts } from 'net';
import { connect as connectTcpTls, TLSSocket, TlsOptions } from 'tls';
import { readFileSync } from 'fs';
import { EventEmitter } from 'events';
import winston from 'winston';
import { Buffer } from 'buffer';

// Configure Winston
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp, file }) => {
      return `${timestamp} [${file}] ${level}: ${message}`;
    })
  ),
  transports: [new winston.transports.Console()]
});

interface ConnectionOptions {
  port?: number;
  hostname?: string;
}

interface ConnectionTlsOptions extends ConnectionOptions {
  certFile?: string;
}


interface QueryPacket {
  metaframe: string;
  dataframeHeader: string;
  query: string;
  encodedParameters: string;
}

class SkytableConnection extends EventEmitter {
  private connection: TLSSocket | Socket;

  constructor(connection: TLSSocket | Socket) {
    super();
    this.connection = connection; 
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.connection.on('error', (error) => {
      logger.error({ message: `Connection error: ${error.message}`, file: __filename });
      this.emit('error', `Connection error: ${error.message}`);
    });
  }




  public async performSkyhashHandshake(username: string, password: string): Promise<void> {
    logger.info({ message: `Performing Skyhash handshake for username: ${username}`, file: __filename });
  
    // Create a Buffer for the handshake packet
    // const usernameLength = Buffer.alloc(4);
    // const passwordLength = Buffer.alloc(4);
  
    // usernameLength.writeUInt32BE(username.length, 0);
    // passwordLength.writeUInt32BE(password.length, 0);
    

    // const usernameBytes = new TextEncoder().encode(username);
// const passwordBytes = new TextEncoder().encode(password);

// Construct the handshake packet
// const handshakePacket = new Uint8Array([
//   0x48, 0x00, 0x00, 0x00, 0x00, 0x00,
//   username.length, 0x0A,  
//   password.length,  
//   ...usernameBytes,  
//   ...passwordBytes,  
// ]);
  
    const handshakePacket = `H\x00\x00\x00\x00\x00${username.length}\n${password.length}\n${username}${password}`

//     const encoder = new TextEncoder();
// const handshakeBytes = encoder.encode(handshakePacket);
  
    logger.info({ message: `Sending handshake packet: ${handshakePacket.toString()}`, file: __filename });
  
    return new Promise<void>((resolve, reject) => {
      if (!this.connection) {
        const errorMessage = 'Socket connection is not available.';
        logger.error({ message: errorMessage, file: __filename });
        reject(new Error(errorMessage));
        return;
      }
      logger.info(this.connection);
  
      this.connection.write(handshakePacket, (writeError) => {
        if (writeError) {
          logger.error({ message: `Error during write: ${writeError.message}`, file: __filename });
          reject(writeError);
          return;
        }
  
        this.connection.once('data', (data) => {

          console.log(data);
          logger.info({ message: 'Received response:', data, file: __filename });

  
          const responseBuffer = Buffer.from(data);
  
          if (responseBuffer.equals(Buffer.from('H\x00\x00\x00\x00\x00', 'utf-8'))) {
            logger.info({ message: 'Skyhash handshake successful', file: __filename });
            resolve();
          } else if (responseBuffer.slice(0, 3).toString('utf-8') === 'H01') {
            const errorCode = parseInt(responseBuffer.slice(3).toString('utf-8'), 10);
            logger.error({ message: `Handshake rejected with error code: ${errorCode}`, file: __filename });
            reject(new Error(`Handshake rejected with error code: ${errorCode}`));
          } else {
            logger.error({ message: `Unexpected response during handshake`, file: __filename });
           resolve();
          }
        });
      });
  
      this.connection.once('error', (error) => {
        logger.error({ message: `Socket error during handshake: ${error.message}`, file: __filename });
        reject(error);
      });
    });
  }


public encodeParameters(parameters: string[]): string {
  return parameters.join('\n');
}

public constructQueryPacket(query: string, parameters: string[]): QueryPacket {
  const encodedParameters = this.encodeParameters(parameters);
  const substitutedQuery = `${query}\n${encodedParameters}`;
  const metaframe = `${Buffer.byteLength(substitutedQuery)}\n`;
  const dataframeHeader = `${Buffer.byteLength(query)}\n`;

  return {
    metaframe,
    dataframeHeader,
    query: substitutedQuery,
    encodedParameters,
  };
}





public async  sendQuery( query: string, parameters: string[] = []): Promise<void> {
  console.info(`initial query: ${query}`);

  const { metaframe, dataframeHeader, query: constructedQuery, encodedParameters } =
    this.constructQueryPacket(query, parameters);

  const queryPacket = `${metaframe}${dataframeHeader}${constructedQuery}${encodedParameters}`;
  logger.info({ message: `Sending query packet: ${queryPacket}`, file: __filename });
//   queryPacket =  ah

  return new Promise<void>((resolve, reject) => {
    if (!this.connection) {
      const errorMessage = 'Socket connection is not available.';
      console.error(errorMessage);
      reject(new Error(errorMessage));
      return;
    }

    this.connection.write(queryPacket, (writeError) => {
      if (writeError) {
        console.error(`Error during write: ${writeError.message}`);
        reject(writeError);
        return;
      }

      const onData = (data: any) => {
        if (Buffer.isBuffer(data)) {
          const bufferData: Buffer = data;
          console.info(`Received response: ${bufferData.toString('hex')}`);

          // Log the raw buffer response
          console.info('Raw response:', bufferData);
        }

        this.connection.off('data', onData);
        resolve();
      };

      this.connection.on('data', onData);

      this.connection.once('error', (error) => {
        console.error(`Socket error during query: ${error.message}`);
        reject(error);
      });
    });
  });
}



}

  


type ConnectionFunction = (options: NetConnectOpts) => Socket;
type ConnectionTlsFunction = (options: TlsOptions) => TLSSocket;

function createConnection(
  connectionFunction: ConnectionFunction | ConnectionTlsFunction,
  options: ConnectionOptions | ConnectionTlsOptions,
): Promise<SkytableConnection> {
  const { port = 2003, hostname = '127.0.0.1', certFile } = options as ConnectionTlsOptions;

  return new Promise((resolve, reject) => {
    const conn =
      connectionFunction === connectTcp
        ? connectTcp({ port, host: hostname })
        : connectTcpTls({ port, host: hostname, ca: certFile ? [readFileSync(certFile)] : undefined });

    conn.on('connect', () => {
      logger.info({ message: 'Connection established', file: __filename });
      const skytableConnection = new SkytableConnection(conn);
      resolve(skytableConnection);
    });

    conn.on('error', (error) => {
      logger.error({ message: `Connection error: ${error.message}`, file: __filename });
      console.error(`Connection error: ${error.message}`);
      reject(error);
    });
  });
}

export async function connect(options: ConnectionOptions = {}, username?: string, password?: string): Promise<SkytableConnection> {
  logger.info({ message: 'Connecting to Skytable...', file: __filename });
  const skytableConnection = await createConnection(connectTcp, options);

  if (username && password) {
    await skytableConnection.performSkyhashHandshake(username, password);
  }
  return skytableConnection;
}

export function connectTls(options: ConnectionTlsOptions = {}, username?: string, password?: string): Promise<SkytableConnection> {
  return createConnection(connectTcpTls, options).then(async (skytableConnection) => {
    if (username && password) {
      await skytableConnection.performSkyhashHandshake(username, password);
    }
    return skytableConnection;
  });
}


