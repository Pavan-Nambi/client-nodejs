import { connect as connectTcp, Socket, NetConnectOpts } from 'net';
import { connect as connectTcpTls, TLSSocket, TlsOptions } from 'tls';
import { readFileSync } from 'fs';
import { SkytableConnection } from "./skytableConnection";
import { logger } from './logging';
import { Config } from './Config';

interface ConnectionOptions {
  port?: number;
  hostname?: string;
}

interface ConnectionTlsOptions extends ConnectionOptions {
  certFile?: string;
}

type ConnectionFunction = (options: NetConnectOpts) => Socket;
type ConnectionTlsFunction = (options: TlsOptions) => TLSSocket;

async function createConnection(
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

      /***********************************okay? **************************************************************************************************** */
      const handshakeMessage = "okay look at this later"; 
      conn.write(handshakeMessage, () => {
        const skytableConnection = new SkytableConnection(conn);
        resolve(skytableConnection);
      });
    });

    conn.on('error', (error) => {
      logger.error({ message: `Connection error: ${error.message}`, file: __filename });
      console.error(`Connection error: ${error.message}`);
      reject(error);
    });
  });
}

export async function connect(config: Config): Promise<SkytableConnection> {
  logger.info({ message: 'Connecting to Skytable...', file: __filename });
  const options: ConnectionOptions = {
    port: config.getPort(),
    hostname: config.getHost(),
  };

  const skytableConnection = await createConnection(connectTcp, options);

  // Log more details about the connection
  logger.info({
    message: 'Connection details:',
    connection: {
      type: skytableConnection.constructor.name,

      encrypted: skytableConnection instanceof TLSSocket,
    },
    file: __filename,
  });

  if (config.getUsername() && config.getPassword()) {
    await skytableConnection.performSkyhashHandshake(config.getUsername(), config.getPassword());
  }

  return skytableConnection;
}


export async function connectTls(config: Config): Promise<SkytableConnection> {
  const options: ConnectionTlsOptions = {
    port: config.getPort(),
    hostname: config.getHost(),
    certFile: 'idksomethinghere',
  };

  const skytableConnection = await createConnection(connectTcpTls, options);

  if (config.getUsername() && config.getPassword()) {
    await skytableConnection.performSkyhashHandshake(config.getUsername(), config.getPassword());
  }

  return skytableConnection;
}

export async function sendQuery(connection: SkytableConnection, query: string) {
  console.log("hey");
  console.log(query);
  logger.info({ message: `Sending query: ${query}`, file: __filename });
  // connection.sendQuery(query);
}
