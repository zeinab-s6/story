export const CHILD_GENDERS = ['boy', 'girl'];

export const CHILD_AVATAR_PATHS = {
  boy: '/images/boy.png',
  girl: '/images/girl.png',
};

export function getChildAvatarUrl(gender) {
  return CHILD_AVATAR_PATHS[gender] || null;
}
