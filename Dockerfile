FROM nginx:1.27-alpine
COPY crater-critters.html /usr/share/nginx/html/index.html
COPY manifest.webmanifest icon.svg /usr/share/nginx/html/
EXPOSE 80
