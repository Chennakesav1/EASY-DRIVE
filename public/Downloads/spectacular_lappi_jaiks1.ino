// C++ code
int animationspeed = 0;

void setup()
{
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(8, OUTPUT);
  pinMode(9, OUTPUT);
  pinMode(10, OUTPUT);
}

void loop()
{
  animationspeed = 400;
  digitalWrite(LED_BUILTIN, HIGH);
  delay(animationspeed); // Wait for animationspeed millisecond(s)
  digitalWrite(LED_BUILTIN, LOW);
  delay(animationspeed); // Wait for animationspeed millisecond(s)
  digitalWrite(8, HIGH);
  delay(animationspeed); // Wait for animationspeed millisecond(s)
  digitalWrite(8, LOW);
  delay(animationspeed); // Wait for animationspeed millisecond(s)
  digitalWrite(9, HIGH);
  delay(animationspeed); // Wait for animationspeed millisecond(s)
  digitalWrite(9, LOW);
  delay(animationspeed); // Wait for animationspeed millisecond(s)
  digitalWrite(10, HIGH);
  delay(animationspeed); // Wait for animationspeed millisecond(s)
  digitalWrite(10, LOW);
  delay(animationspeed); // Wait for animationspeed millisecond(s)
}