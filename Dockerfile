FROM nginx:alpine

COPY index.html robots.txt sitemap.xml site.webmanifest /usr/share/nginx/html/
COPY app/ /usr/share/nginx/html/app/
COPY assets/ /usr/share/nginx/html/assets/

EXPOSE 80
