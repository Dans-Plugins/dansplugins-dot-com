FROM eclipse-temurin:17-jdk-alpine AS builder

WORKDIR /build

COPY mvnw pom.xml ./
COPY .mvn .mvn
COPY src src

RUN ./mvnw -DskipTests package

FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY --from=builder /build/target/dpc-api-*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
