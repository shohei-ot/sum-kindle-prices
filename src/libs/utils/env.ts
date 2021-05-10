export const env = (envName: string) => {
  const envNameUpper = envName.toUpperCase();
  const v = process.env[envNameUpper];
  if (typeof v === 'undefined') {
    throw new Error(`"${envNameUpper}" は .env に存在しません`);
  }
  return v;
};
