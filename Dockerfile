FROM nginx:alpine

COPY index.html robots.txt sitemap.xml site.webmanifest /usr/share/nginx/html/
COPY app/ /usr/share/nginx/html/app/
COPY assets/ /usr/share/nginx/html/assets/
COPY play-store-screenshot-generator/ /usr/share/nginx/html/play-store-screenshot-generator/
COPY app-store-screenshot-generator/ /usr/share/nginx/html/app-store-screenshot-generator/
COPY feature-graphic-generator/ /usr/share/nginx/html/feature-graphic-generator/
COPY app-store-screenshot-sizes/ /usr/share/nginx/html/app-store-screenshot-sizes/
COPY google-play-screenshot-sizes/ /usr/share/nginx/html/google-play-screenshot-sizes/
COPY appscreens-alternative/ /usr/share/nginx/html/appscreens-alternative/

EXPOSE 80
