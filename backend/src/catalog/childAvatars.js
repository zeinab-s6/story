export const CHILD_GENDERS = ['boy', 'girl'];

export const CHILD_AVATAR_PATHS = {
  boy: '/images/boy.jpg',
  girl: '/images/girl.jpg',
};

export function getChildAvatarUrl(gender) {
  return CHILD_AVATAR_PATHS[gender] || null;
}
