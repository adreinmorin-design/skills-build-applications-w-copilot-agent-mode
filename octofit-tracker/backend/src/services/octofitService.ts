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

function normalizeGoal(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
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

  if (user.team?.toString() !== team._id.toString()) {
    user.team = team._id;
    await user.save();
  }
  await Team.updateOne({ _id: team._id }, { $addToSet: { members: user._id } });

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

  const existingMembers = await User.find({ _id: { $in: validMembers } }).select('_id').lean();
  const validExistingIds = new Set(existingMembers.map((member) => member._id.toString()));
  const invalidMemberIds = validMembers.filter((member) => !validExistingIds.has(member.toString()));
  if (invalidMemberIds.length > 0) {
    throw Object.assign(new Error('Team members must reference existing users'), { status: 400 });
  }

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
  const preferredGoal = normalizeGoal(user.fitnessGoal) || normalizeGoal(recentActivity[0]?.type) || 'endurance';
  const recentType = typeof recentActivity[0]?.type === 'string' ? recentActivity[0].type.toLowerCase() : '';
  const workouts = await Workout.find().lean();

  const ranked = workouts
    .map((workout) => {
      const focus = typeof workout.focus === 'string' ? workout.focus.toLowerCase() : '';
      let score = 0;
      if (focus === preferredGoal) score += 4;
      if (focus === recentType) score += 2;
      if (focus === normalizeGoal(user.fitnessGoal)) score += 2;
      if (focus.includes('endurance') && preferredGoal.includes('endurance')) score += 1;
      if (focus.includes('strength') && preferredGoal.includes('strength')) score += 1;
      if (focus.includes('mobility') && preferredGoal.includes('mobility')) score += 1;
      return { workout, score };
    })
    .sort((left, right) => right.score - left.score || left.workout.title.localeCompare(right.workout.title));

  if (!ranked.length) {
    return [];
  }

  return ranked.slice(0, 3).map(({ workout, score }) => {
    const focus = typeof workout.focus === 'string' ? workout.focus : 'general fitness';
    const reasonParts = [];
    if (score >= 4) reasonParts.push(`matches your ${preferredGoal} goal`);
    if (recentType) reasonParts.push(`fits your recent ${recentType} activity`);
    if (!reasonParts.length) reasonParts.push('supports steady progress');
    return {
      ...workout,
      reason: `${reasonParts.join(' and ')}.`,
    };
  });
}

export { User };
