import EventEmitter from "events";
import { Socket } from "net";
import { TLSSocket } from "tls";
import { logger } from "./logging";


export class SkytableConnection extends EventEmitter {
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
  /**************************************************************************************************************************************************************************************
   * 
   * 
   *   NEED TO LOOK INTO THIS LATER
   * 
   * 
   * 
   **************************************************************************************************************************************************************************************/
    public async performSkyhashHandshake(username: string, password: string): Promise<void> {
      logger.info({ message: `Performing Skyhash handshake for username: ${username}`, file: __filename });
      const handshakePacket = `H\x00\x00\x00\x00\x00${username.length}${password.length}\n${username}${password}`;
    
      logger.info({ message: `Sending handshake packet: ${handshakePacket}`, file: __filename });
    
      return new Promise<void>((resolve, reject) => {
        if (!this.connection) {
          const errorMessage = 'Socket connection is not available.';
          logger.error({ message: errorMessage, file: __filename });
          reject(new Error(errorMessage));
          return;
        }
    
        this.connection.write(handshakePacket, 'utf-8', (writeError) => {
          if (writeError) {
            logger.error({ message: `Error during write: ${writeError.message}`, file: __filename });
            reject(writeError);
            return;
          }
    
          this.connection.once('data', (data) => {
            console.log("data", data);
    
            const responseBuffer = Buffer.from(data);
            console.log("responseBuffer", responseBuffer);
    
            const responseString = responseBuffer.toString('utf-8').replace(/^./, 'H');
  
    
            if (responseString.startsWith('H')) {
              logger.info({ message: 'Skyhash handshake successful', file: __filename });
              resolve();
            } else if (responseString.startsWith('H01')) {
              const errorCode = parseInt(responseString.slice(3), 10);
              logger.error({ message: `Handshake rejected with error code: ${errorCode}`, file: __filename });
              reject(new Error(`Handshake rejected with error code: ${errorCode}`));
            } else {
              logger.error({ message: `Unexpected response during handshake: ${responseString}`, file: __filename });
              reject(new Error(`Unexpected response during handshake: ${responseString}`));
            }
          });
        });
    
        this.connection.once('error', (error) => {
          logger.error({ message: `Socket error during handshake: ${error.message}`, file: __filename });
          reject(error);
        });
      });
    }
    
  
    public sendQuery(query: string) {
      logger.info({ message: `Sending query: ${query}`, file: __filename });
      // do this later
    }
  }