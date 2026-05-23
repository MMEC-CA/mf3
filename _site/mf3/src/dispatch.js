// ── Dispatch / Patrol Assignments System ──────────────────────────

const ASSIGNMENT_TEMPLATES = [
  {
    id: 'noise_complaint',
    title: 'Noise Complaint',
    desc: 'Loud music reported. Investigate and issue warning.',
    location: 'house',
    timeLimit: 120, // seconds
    reward: 15,
    penalty: -5,
  },
  {
    id: 'shoplifting',
    title: 'Shoplifting in Progress',
    desc: 'Store owner reports a theft. Respond and apprehend suspect.',
    location: 'convenience',
    timeLimit: 90,
    reward: 25,
    penalty: -15,
  },
  {
    id: 'disturbance',
    title: 'Public Disturbance',
    desc: 'Fight reported outside the location. Restore order.',
    location: 'club',
    timeLimit: 100,
    reward: 20,
    penalty: -10,
  },
  {
    id: 'suspicious',
    title: 'Suspicious Activity',
    desc: 'Caller reports suspicious person loitering. Check it out.',
    location: 'bank',
    timeLimit: 150,
    reward: 18,
    penalty: -8,
  },
  {
    id: 'traffic',
    title: 'Traffic Hazard',
    desc: 'Debris reported on roadway. Secure the scene.',
    location: 'gas',
    timeLimit: 80,
    reward: 12,
    penalty: -5,
  },
  {
    id: 'wellness',
    title: 'Wellness Check',
    desc: 'Neighbor concerned about resident. Perform wellness check.',
    location: 'house',
    timeLimit: 180,
    reward: 22,
    penalty: -10,
  },
  {
    id: 'theft',
    title: 'Theft Report',
    desc: 'Customer reports stolen property. Take statement, investigate.',
    location: 'cafe',
    timeLimit: 120,
    reward: 20,
    penalty: -10,
  },
  {
    id: 'alarm',
    title: 'Silent Alarm',
    desc: 'Silent alarm triggered. Respond immediately.',
    location: 'jewelry',
    timeLimit: 60,
    reward: 30,
    penalty: -20,
  },
];

let activeAssignments = [];
let completedAssignments = 0;
let assignmentTimer = 0;  // time until next assignment spawns
let assignmentQueue = [];

export function getActiveAssignments() {
  return activeAssignments;
}

export function getCompletedCount() {
  return completedAssignments;
}

export function resetAssignments() {
  activeAssignments = [];
  completedAssignments = 0;
  assignmentTimer = 30; // first assignment after 30s
  assignmentQueue = [];
}

export function updateDispatch(dt, entrances, onToast, onNewAssignment) {
  assignmentTimer -= dt;

  // Spawn new assignments periodically
  if (assignmentTimer <= 0 && activeAssignments.length < 3) {
    const template = ASSIGNMENT_TEMPLATES[Math.floor(Math.random() * ASSIGNMENT_TEMPLATES.length)];
    const validEntrances = entrances.filter(e => {
      if (template.location === 'house') return e.kind === 'house';
      if (template.location === 'gas') return e.storeRole === 'gas';
      return e.storeRole === template.location || e.kind === template.location;
    });

    if (validEntrances.length > 0) {
      const target = validEntrances[Math.floor(Math.random() * validEntrances.length)];
      const assignment = {
        ...template,
        id: `${template.id}_${Date.now()}`,
        targetEntrance: target,
        targetLabel: target.label,
        remaining: template.timeLimit,
        accepted: false,
      };
      activeAssignments.push(assignment);
      assignmentQueue.push(assignment);
      if (onNewAssignment) onNewAssignment(assignment);
      if (onToast) onToast(`DISPATCH: ${template.title} at ${target.label}`);
    }
    assignmentTimer = 45 + Math.random() * 60; // 45-105s between assignments
  }

  // Tick remaining time
  for (const a of activeAssignments) {
    if (a.accepted) {
      a.remaining -= dt;
    }
  }

  // Remove expired assignments
  const expired = activeAssignments.filter(a => a.accepted && a.remaining <= 0);
  for (const a of expired) {
    if (onToast) onToast(`Assignment expired: ${a.title} (${a.penalty} trust)`);
  }
  activeAssignments = activeAssignments.filter(a => !(a.accepted && a.remaining <= 0));
  assignmentQueue = assignmentQueue.filter(a => activeAssignments.includes(a));
}

export function completeAssignment(playerInteriorId) {
  const match = activeAssignments.find(a => {
    if (!a.accepted) return false;
    // Check if player is at the right interior
    return true; // simplified — player calls this when they're at the right place
  });

  if (match) {
    activeAssignments = activeAssignments.filter(a => a.id !== match.id);
    assignmentQueue = assignmentQueue.filter(a => a.id !== match.id);
    completedAssignments++;
    return match;
  }
  return null;
}

export function acceptAssignment(id) {
  const a = activeAssignments.find(a => a.id === id);
  if (a && !a.accepted) {
    a.accepted = true;
    return a;
  }
  return null;
}
