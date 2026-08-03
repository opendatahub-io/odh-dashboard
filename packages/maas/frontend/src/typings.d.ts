declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.svg';
declare module '*.css';
declare module '*.scss';
declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
declare module '*.wav';
declare module '*.mp3';
declare module '*.m4a';
declare module '*.rdf';
declare module '*.ttl';
declare module '*.pdf';
