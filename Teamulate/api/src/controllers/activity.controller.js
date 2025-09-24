import { ActivityModel } from '../models/activity.model.js';

export const ActivityController = {
  listByProject: async (req, res) => {
    try {
      const items = await ActivityModel.listByProject(req.params.projectId);
      res.json({ items });
    } catch (e) {
      console.error('[Activity.listByProject]', e);
      res.status(500).json({ error: 'list activity failed' });
    }
  },
};
