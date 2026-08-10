import { mountApp } from './ui/app';

const mount = document.querySelector<HTMLDivElement>('#app');

if (mount) void mountApp(mount);
