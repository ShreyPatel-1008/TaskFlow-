class OnlineUserStore {
  constructor() {
    this.users = new Map();
    // Key: userId string
    // Value: {
    //   socketIds: Set of socketId strings (multi-tab support),
    //   workspaceIds: Set of workspaceId strings,
    //   lastSeen: Date,
    //   status: 'online' | 'away' | 'offline'
    // }
  }

  addUser(userId, socketId, workspaceId) {
    if (this.users.has(userId)) {
      const existing = this.users.get(userId);
      existing.socketIds.add(socketId);
      existing.workspaceIds.add(workspaceId);
      existing.status = 'online';
      existing.lastSeen = new Date();
    } else {
      this.users.set(userId, {
        socketIds: new Set([socketId]),
        workspaceIds: new Set([workspaceId]),
        lastSeen: new Date(),
        status: 'online'
      });
    }
  }

  removeUser(socketId) {
    for (const [userId, data] of this.users.entries()) {
      if (data.socketIds.has(socketId)) {
        data.socketIds.delete(socketId);
        
        // If user has no more sockets, remove them entirely
        if (data.socketIds.size === 0) {
          this.users.delete(userId);
          return { userId, workspaceIds: [...data.workspaceIds], fullyOffline: true };
        }
        
        // User still has other tabs open
        return { userId, workspaceIds: [...data.workspaceIds], fullyOffline: false };
      }
    }
    return null;
  }

  setStatus(userId, status) {
    if (this.users.has(userId)) {
      this.users.get(userId).status = status;
      this.users.get(userId).lastSeen = new Date();
    }
  }

  getOnlineUsers(workspaceId) {
    const result = [];
    for (const [userId, data] of this.users.entries()) {
      if (data.workspaceIds.has(workspaceId)) {
        result.push({
          userId,
          status: data.status,
          lastSeen: data.lastSeen
        });
      }
    }
    return result;
  }

  isUserOnline(userId) {
    return this.users.has(userId) && 
           this.users.get(userId).status !== 'offline';
  }

  // Returns a single socketId (first one) for backward compat
  getUserSocketId(userId) {
    const data = this.users.get(userId);
    if (!data || data.socketIds.size === 0) return null;
    return data.socketIds.values().next().value;
  }

  // Returns all socketIds for a user (multi-tab)
  getUserSocketIds(userId) {
    const data = this.users.get(userId);
    if (!data) return [];
    return [...data.socketIds];
  }

  getUserStatus(userId) {
    return this.users.get(userId)?.status || 'offline';
  }
}

module.exports = new OnlineUserStore();
