FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# VITE_API_URL tem de estar disponível como variável de AMBIENTE durante o
# "npm run build" (é nesse momento que o Vite a substitui no código
# compilado) — nunca como variável de ambiente do contentor final, que já
# não teria qualquer efeito (o Nginx serve ficheiros estáticos já
# compilados, não lê variáveis de ambiente). Por isso recebe-se aqui como
# ARG de build e não como ENV do serviço no docker-compose.yml.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
