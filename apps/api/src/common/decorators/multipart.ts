import { SetMetadata } from '@nestjs/common';

// Explicit opt-in for authenticated upload handlers only; Origin/CSRF stay required.
export const Multipart = () => SetMetadata('multipart', true);
