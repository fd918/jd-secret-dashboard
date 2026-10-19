export function createIdentityRenderer(state){const userOperationsScope=true;const canServerAction=()=>state.canManage;const activeFocusOperatorGroup=()=>null;const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));    const userIdOf = user => String(user?.id || user?.userId || "");
    const userDisplayName = user => Object.prototype.hasOwnProperty.call(state.userAliases, userIdOf(user)) ? (state.userAliases[userIdOf(user)] || user?.sourceName || user?.name || "-") : (user?.name || "-");
    const userSearchText = user => `${userDisplayName(user)}${user?.name || ""}${userIdOf(user)}`.toLowerCase();
    const userEditSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>';
    const userFavoriteSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/></svg>';
    const unifiedNoteEditButton = user => {
      const userId = userIdOf(user);
      const note = (state.userNotes?.[userId] || []).join("\n");
      if (typeof userOperationsScope !== "undefined" && userOperationsScope && !canServerAction("user-operations.manage")) return `<span class="muted">${escapeHtml(note || "暂无备注")}</span>`;
      return `<button class="btn" data-edit-unified-note="${escapeHtml(userId)}" title="${escapeHtml(note || "添加用户备注")}">${escapeHtml(note || "添加备注")}</button>`;
    };
    const aliasEditButton = user => (typeof userOperationsScope !== "undefined" && userOperationsScope && !canServerAction("user-operations.manage")) ? "" : `<button class="user-identity-action" data-edit-user-alias="${escapeHtml(userIdOf(user))}" title="修改名字" aria-label="修改名字">${userEditSvg}</button>`;
    function userIsFocused(user) {
      const userId = userIdOf(user);
      if (!userId) return false;
      if (user?.focused === true || user?.isFocused === true || user?.isFocus === true) return true;
      const group = activeFocusOperatorGroup(state.focusData);
      return Boolean(group?.userIds?.map(String).includes(userId));
    }
    function focusFavoriteButton(user, options = {}) {
      if (typeof userOperationsScope !== "undefined" && userOperationsScope && !canServerAction("user-operations.manage")) return "";
      const userId = userIdOf(user);
      const focused = options.focused === true || userIsFocused(user);
      const action = focused ? `data-remove-focus="1" data-user-id="${escapeHtml(userId)}"` : `data-add-detail-focus="${escapeHtml(userId)}"`;
      const label = focused ? "取消收藏" : "收藏";
      return `<button class="user-identity-action favorite" ${action} title="${label}" aria-label="${label}" aria-pressed="${focused}">${userFavoriteSvg}</button>`;
    }
    const addFocusButton = user => focusFavoriteButton(user);
    const copyUserIdButton = user => `<button class="user-identity-copy" type="button" data-copy-user-id="${escapeHtml(userIdOf(user))}" title="点击复制用户ID">ID ${escapeHtml(userIdOf(user) || "-")}</button>`;
    const copyUserPhoneButton = user => {
      const phone = String(user?.phone || "-");
      const disabled = !phone || phone === "-";
      return `<button class="user-identity-copy phone" type="button" ${disabled ? "disabled" : `data-copy-user-phone="${escapeHtml(phone)}"`} title="${disabled ? "暂无手机号" : "点击复制手机号"}">手机号 ${escapeHtml(phone || "-")}</button>`;
    };
    function userIdentityMarkup(user, options = {}) {
      const name = escapeHtml(userDisplayName(user));
      const version = escapeHtml(user?.version || "-");
      const nameHtml = options.nameHtml || `<strong class="user-identity-name">${name}</strong>`;
      const favorite = options.favorite === false ? "" : (options.favoriteHtml || focusFavoriteButton(user, { focused: options.focused }));
      return `<div class="user-identity ${options.className || ""}"><div class="user-identity-name-row">${nameHtml}${options.edit === false ? "" : aliasEditButton(user)}${favorite}${options.extraActions || ""}</div><div class="user-identity-meta">${copyUserIdButton(user)}<span class="user-identity-version" data-version="${version}" title="版本：${version}">${version}</span></div><div class="user-identity-phone">${copyUserPhoneButton(user)}</div></div>`;
    }

return {userIdentityMarkup,userEditSvg,unifiedNoteEditButton};}
