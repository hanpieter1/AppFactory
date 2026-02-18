// REST API routes for Client management
// US-076: Clients database model & API
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { ClientService } from '../../services/client.service';
import { clientRepository } from '../../repositories/client.repository';
import { ValidationError } from '../../utils/errors';

const router = Router();
const clientService = new ClientService(clientRepository);

// POST /api/clients — Create a new client
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, code, active } = req.body as {
      name?: string;
      code?: string;
      active?: boolean;
    };

    if (!name) {
      throw new ValidationError('Client name is required');
    }
    if (!code) {
      throw new ValidationError('Client code is required');
    }

    const client = await clientService.createClient({ name, code, active });
    res.status(201).json(client);
  })
);

// GET /api/clients — List all clients (with optional filters)
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { active, search } = req.query as { active?: string; search?: string };

    const filters: { active?: boolean; search?: string } = {};
    if (active === 'true') filters.active = true;
    if (active === 'false') filters.active = false;
    if (search) filters.search = search;

    const clients = await clientService.getAllClients(filters);
    res.status(200).json(clients);
  })
);

// GET /api/clients/:id — Get client by ID
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const client = await clientService.getClientById(req.params.id);
    res.status(200).json(client);
  })
);

// PATCH /api/clients/:id — Update a client
router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, code, active } = req.body as {
      name?: string;
      code?: string;
      active?: boolean;
    };
    const client = await clientService.updateClient(req.params.id, { name, code, active });
    res.status(200).json(client);
  })
);

// DELETE /api/clients/:id — Delete a client
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await clientService.deleteClient(req.params.id);
    res.status(204).send();
  })
);

export default router;
