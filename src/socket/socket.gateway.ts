import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*', methods: ['GET', 'POST'] },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<string, string> = new Map();

  handleConnection(client: Socket) {
    console.log(`Client connecté: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.connectedUsers.delete(client.id);
    console.log(`Client déconnecté: ${client.id}`);
  }

  @SubscribeMessage('register')
  handleRegister(client: Socket, payload: { userId: string; role: string }) {
    const key = `${payload.role}_${payload.userId}`;
    this.connectedUsers.set(client.id, key);

    switch (payload.role) {
      case 'SERVEUR':
        client.join(`serveur:${payload.userId}`);
        break;
      case 'CUISINE':
        client.join('cuisine');
        break;
      case 'BAR':
        client.join('bar');
        break;
      case 'MANAGER':
      case 'ADMIN':
        client.join('admin');
        break;
    }
  }

  @SubscribeMessage('joinTable')
  handleJoinTable(client: Socket, tableId: string) {
    client.join(`table:${tableId}`);
  }

  // Notifier un serveur d'une nouvelle commande
  notifierNouvelleCommande(serveurId: number, commande: any) {
    this.server.to(`serveur:${serveurId}`).emit('nouvelle_commande', commande);
  }

  // Notifier la cuisine
  notifierCuisine(commande: any) {
    this.server.to('cuisine').emit('nouvelle_commande_cuisine', commande);
  }

  // Notifier le bar
  notifierBar(commande: any) {
    this.server.to('bar').emit('nouvelle_commande_bar', commande);
  }

  // Notifier le client de sa commande
  notifierClient(tableId: number, notification: any) {
    this.server.to(`table:${tableId}`).emit('commande_status', notification);
  }

  // Notifier les admins/managers
  notifierAdmin(notification: any) {
    this.server.to('admin').emit('notification_admin', notification);
  }

  // Notifier un utilisateur specifique (pour notifications DB)
  notifierUtilisateur(userId: number, event: string, data: any) {
    this.server.to(`serveur:${userId}`).emit(event, data);
    // Also notify admins for important events
    if (event === 'notification_user') {
      this.server.to('admin').emit('notification_admin', data);
    }
  }

  // Notifier tous les utilisateurs connectes (broadcast)
  notifierTous(event: string, data: any) {
    this.server.emit(event, data);
  }
}
