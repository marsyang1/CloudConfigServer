FROM java:8
VOLUME /ConfigServer
EXPOSE 8080
ENV server.port 8080
ENV spring.rabbitmq.host dockerhost
ENV spring.rabbitmq.port 5672
ENV spring.rabbitmq.username clare
ENV spring.rabbitmq.password 123456
ADD config-server.jar app.jar
RUN bash -c 'touch /app.jar '
ENTRYPOINT ["java","-Djava.security.egd=file:/dev/./urandom","-jar","/app.jar"]