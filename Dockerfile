FROM nginx:1.27-alpine
COPY crater-critters.html /usr/share/nginx/html/index.html
EXPOSE 80
