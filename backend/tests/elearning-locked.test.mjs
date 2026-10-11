import test, { afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import models, { sequelize } from '../models/index.js';
import authConfig from '../config/auth.js';
import { publicIndex } from '../controllers/Admin/ElearningVideoController.js';

// B2 — a locked e-learning video must not leak platform / video_id / video_url
// (anything from which a watch URL is reconstructable); an unlocked one keeps
// them. A logged-in student (batch 5) is used so we exercise BOTH branches.

const orig = { findAll: models.ElearningVideo.findAll, studentFindOne: models.Student.findOne };
afterEach(() => { models.ElearningVideo.findAll = orig.findAll; models.Student.findOne = orig.studentFindOne; });
after(async () => { try { await sequelize.close(); } catch { /* no connection */ } });

const makeRes = () => ({ body: undefined, json(p) { this.body = p; return this; }, status() { return this; } });

test('locked video strips platform/video_id/video_url; unlocked keeps them', async () => {
  // A student in batch 5 (so a batch-99 video is locked, an 'all' video is not).
  const token = jwt.sign({ id: 9, role: 'student' }, authConfig.jwtSecret, { algorithm: authConfig.jwtAlgorithm });
  models.Student.findOne = async () => ({ current_batch_id: 5, Batch: { id: 5, course_id: 10 }, section: 'a' });

  const locked = { access_type: 'batch', batch_id: 99, dataValues: { id: 1, title: 'Locked', video_url: 'https://youtu.be/x', video_id: 'x', platform: 'youtube' } };
  const open = { access_type: 'all', dataValues: { id: 2, title: 'Open', video_url: 'https://youtu.be/y', video_id: 'y', platform: 'youtube' } };
  models.ElearningVideo.findAll = async () => [locked, open];

  const res = makeRes();
  await publicIndex({ headers: { authorization: `Bearer ${token}` }, query: {} }, res);

  assert.equal(locked.dataValues.is_unlocked, false);
  assert.equal(locked.dataValues.video_url, null);
  assert.equal(locked.dataValues.video_id, null);
  assert.equal(locked.dataValues.platform, null);

  assert.equal(open.dataValues.is_unlocked, true);
  assert.equal(open.dataValues.video_url, 'https://youtu.be/y');
  assert.equal(open.dataValues.video_id, 'y');
  assert.equal(open.dataValues.platform, 'youtube');
});
