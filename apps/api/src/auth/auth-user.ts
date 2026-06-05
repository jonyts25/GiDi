/** Payload de usuario en request (compatible con emitDecoratorMetadata). */
export class AuthUser {
  sub!: string;
  email?: string;
  fullName?: string;
  roles!: string[];
}
