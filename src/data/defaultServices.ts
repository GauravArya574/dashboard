import { DockerService } from '../types';

export const DEFAULT_SERVICES: DockerService[] = [
  {
    id: 'svc_portainer',
    name: 'Portainer',
    icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/portainer.png',
    localUrl: 'http://192.168.1.100:9000',
    remoteUrl: 'https://portainer.example.com',
  },
  {
    id: 'svc_nginx_pm',
    name: 'Nginx Proxy Manager',
    icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/nginx-proxy-manager.png',
    localUrl: 'http://192.168.1.100:81',
    remoteUrl: 'https://npm.example.com',
  },
  {
    id: 'svc_pihole',
    name: 'Pi-hole',
    icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/pi-hole.png',
    localUrl: 'http://192.168.1.100:8080/admin',
    remoteUrl: 'https://pihole.example.com/admin',
  },
  {
    id: 'svc_plex',
    name: 'Plex Media Server',
    icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/plex.png',
    localUrl: 'http://192.168.1.100:32400',
    remoteUrl: 'https://plex.example.com',
  },
  {
    id: 'svc_home_assistant',
    name: 'Home Assistant',
    icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/home-assistant.png',
    localUrl: 'http://192.168.1.100:8123',
    remoteUrl: 'https://ha.example.com',
  },
  {
    id: 'svc_grafana',
    name: 'Grafana',
    icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/grafana.png',
    localUrl: 'http://192.168.1.100:3000',
    remoteUrl: 'https://grafana.example.com',
  },
];
