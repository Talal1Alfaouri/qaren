import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

declare const process: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: "*", methods: ["GET","POST","PUT","DELETE","PATCH"] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix("api/v1");
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log("Qaren API running on port " + port);
}
bootstrap();
