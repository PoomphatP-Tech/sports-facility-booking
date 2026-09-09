const userStore = require('../store/user.store');

const buildError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const assertRequiredFields = (payload, requiredFields, message) => {
  const hasMissingField = requiredFields.some((field) => !payload[field]);
  if (hasMissingField) {
    throw buildError(message, 400);
  }
};

const toPublicUser = (user) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName || '',
  lastName: user.lastName || '',
  dateOfBirth: user.dateOfBirth || '',
  address: user.address || '',
  role: user.role || 'member',
});

const isProfileIncomplete = (user) =>
  !user.firstName || !user.lastName || !user.dateOfBirth || !user.address;

const validateRegisterDetailsInput = ({
  firstName,
  lastName,
  dateOfBirth,
  address,
}) => {
  assertRequiredFields(
    { firstName, lastName, dateOfBirth, address },
    ['firstName', 'lastName', 'dateOfBirth', 'address'],
    'firstName, lastName, dateOfBirth, and address are required'
  );
};

const registerCredentials = async ({ firebaseUid, email }) => {
  assertRequiredFields(
    { firebaseUid, email },
    ['firebaseUid', 'email'],
    'firebaseUid and email are required'
  );

  const existingUser = await userStore.findByEmail(email);

  if (existingUser) {
    return {
      nextStep: isProfileIncomplete(existingUser) ? 'details' : 'complete',
      message: 'User already exists',
      user: toPublicUser(existingUser),
    };
  }

  const user = await userStore.create({
    firebaseUid,
    email,
    firstName: null,
    lastName: null,
    dateOfBirth: null,
    address: null,
    role: 'member',
  });

  await userStore.createMember(user.id);

  return {
    nextStep: 'verifyEmail',
    message: 'User created. Please verify your email.',
    user: toPublicUser(user),
  };
};

const completeRegisterDetails = async ({
  firstName,
  lastName,
  dateOfBirth,
  address,
  userId,
}) => {
  validateRegisterDetailsInput({
    firstName,
    lastName,
    dateOfBirth,
    address,
  });

  const user = await userStore.updateProfileById(userId, {
    firstName,
    lastName,
    dateOfBirth,
    address,
  });

  if (!user) {
    throw buildError('user not found', 404);
  }

  return {
    user: toPublicUser(user),
  };
};

const googleSync = async ({ firebaseUid, email, firstName, lastName }) => {
  if (!firebaseUid || !email) throw buildError('firebaseUid and email are required', 400);

  let user = await userStore.findByFirebaseUid(firebaseUid);

  if (!user) {
    user = await userStore.findByEmail(email);
  }

  if (!user) {
    user = await userStore.create({
      firebaseUid,
      email,
      firstName: firstName || null,
      lastName: lastName || null,
      dateOfBirth: null,
      address: null,
      role: 'member',
    });
    await userStore.createMember(user.id);
  }

  return {
    user: toPublicUser(user),
    nextStep: isProfileIncomplete(user) ? 'details' : null,
  };
};

module.exports = {
  registerCredentials,
  completeRegisterDetails,
  googleSync,
};