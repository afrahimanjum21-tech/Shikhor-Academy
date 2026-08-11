import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Routine = sequelize.define('Routine', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  batch_id: { type: DataTypes.INTEGER },
  day: { type: DataTypes.STRING(20) },
  subject: { type: DataTypes.STRING },
  teacher_name: { type: DataTypes.STRING },
  start_time: { type: DataTypes.STRING },
  end_time: { type: DataTypes.STRING },
  time_slot: { type: DataTypes.STRING(50) },
  teacher: { type: DataTypes.STRING },
  room: { type: DataTypes.STRING },
  lab: { type: DataTypes.STRING },
  notes: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('draft', 'published', 'archived'), defaultValue: 'draft' },
  academic_year: { type: DataTypes.STRING(20) },
  session: { type: DataTypes.STRING(20) },
  department: { type: DataTypes.STRING },
  program: { type: DataTypes.STRING },
  semester: { type: DataTypes.STRING(20) },
  section: { type: DataTypes.STRING(20) },
   shift: { type: DataTypes.STRING(20) },
   updated_by: { type: DataTypes.INTEGER },
}, {
  indexes: [
    // Business-key uniqueness so saveAll upserts don't create duplicate rows.
    // `status` is included so a published routine and an archived routine can
    // coexist for the same time slot (used by the publish flow).
    {
      unique: true,
      fields: ['batch_id', 'day', 'start_time', 'end_time', 'status'],
    },
  ],
});

Routine.associate = (models) => {
  Routine.belongsTo(models.Batch, { foreignKey: 'batch_id' });
  Routine.belongsTo(models.User, { foreignKey: 'updated_by', as: 'Updater' });
};

export default Routine;
