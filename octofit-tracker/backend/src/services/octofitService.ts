import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function isValidId(value: unknown): value is string {
  return typeof value === 'string' && mongoose.isValidObjectId(value);
}

function normalizeMinutes(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const minutes = Number(value);
    if (Number.isFinite(minutes) && minutes > 0) return minutes;
  }
  return null;
}

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1 }).lean();
}

export async function createActivity(input: unknown) {
  const body = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  const userId = body.userId;
  const teamId = body.teamId;
  const type = typeof body.type === 'string' ? body.type.trim().toLowerCase() : '';
  const minutes = normalizeMinutes(body.minutes);

  if (!isValidId(userId) || !isValidId(teamId) || !type || minutes === null) {
    throw Object.assign(new Error('Activity requires valid userId, teamId, type, and minutes'), { status: 400 });
  }

  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found for activity'), { status: 400 });
  }

  const team = await Team.findById(teamId);
  if (!team) {
    throw Object.assign(new Error('Team not found for activity'), { status: 400 });
  }

  const multiplier = type === 'strength' ? 1.5 : type === 'cycle' ? 1.25 : type === 'walk' ? 0.9 : 1;
  const activity = await Activity.create({
    user: user._id,
    team: team._id,
    type,
    minutes,
    points: Math.max(1, Math.round(minutes * multiplier)),
    occurredAt: new Date(),
  });

  return activity.toObject();
}

export async function listTeams() {
  return Team.find().sort({ name: 1 }).lean();
}

export async function createTeam(input: unknown) {
  const body = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    throw Object.assign(new Error('Team name is required'), { status: 400 });
  }

  const mascot = typeof body.mascot === 'string' ? body.mascot.trim() : '';
  if (!mascot) {
    throw Object.assign(new Error('Team mascot is required'), { status: 400 });
  }

  const members = Array.isArray(body.members) ? body.members : [];
  const validMembers = members.map((member) => {
    if (typeof member !== 'string' || !mongoose.isValidObjectId(member)) {
      throw Object.assign(new Error('Team members must be valid object ids'), { status: 400 });
    }
    return new mongoose.Types.ObjectId(member);
  });

  const team = await Team.create({ name, mascot, members: validMembers });
  return team.toObject();
}

export async function getLeaderboard() {
  const rankings = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $sort: { totalPoints: -1, _id: 1 } },
  ]);

  if (!rankings.length) return [];

  const teamIds = rankings.map((entry) => entry._id);
  const teams = await Team.find({ _id: { $in: teamIds } }).lean();
  const teamNameById = new Map(teams.map((team) => [team._id.toString(), team.name]));

  return rankings.map((entry, index) => ({
    teamName: teamNameById.get(entry._id.toString()) ?? 'Unknown',
    totalPoints: entry.totalPoints,
    rank: index + 1,
  }));
}

export async function suggestWorkouts(userEmail: string) {
  const email = decodeURIComponent(userEmail).trim();
  const user = await User.findOne({ email }).lean();

  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const recentActivity = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(1).lean();
  const preferredFocus = typeof user.fitnessGoal === 'string' && user.fitnessGoal.trim() ? user.fitnessGoal.trim().toLowerCase() : (recentActivity[0]?.type ?? 'endurance');
  const workouts = await Workout.find().lean();

  const ranked = workouts
    .map((workout) => {
      const focus = typeof workout.focus === 'string' ? workout.focus.toLowerCase() : '';
      const activityType = typeof recentActivity[0]?.type === 'string' ? recentActivity[0].type.toLowerCase() : '';
      let score = 0;
      if (focus === preferredFocus) score += 3;
      if (focus === activityType) score += 2;
      if (focus === user.fitnessGoal?.toLowerCase()) score += 2;
      return { workout, score };
    })
    .sort((left, right) => right.score - left.score || left.workout.title.localeCompare(right.workout.title));

  if (!ranked.length) {
    return [];
  }

  const winningWorkout = ranked[0].workout;
  const reason = recentActivity[0]?.type
    ? `Matches your ${user.fitnessGoal || 'recent'} goal and recent ${recentActivity[0].type} activity.`
    : `Matches your ${user.fitnessGoal || 'current'} goal.`;

  return [{ ...winningWorkout, reason }];
}

export { User };
