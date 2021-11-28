FROM node:13.12.0-alpine as react
WORKDIR /build 
ADD . .
WORKDIR /build/frontend
RUN npm install
RUN npm run build

FROM golang:alpine
WORKDIR /build
COPY --from=react /build /build
RUN go build -o main

CMD ["./main"]
EXPOSE 80