### Johan  Estiven Suarez Perdomo A00404253
### Juan José Muñoz Franco A00405005
### Juan Sebastián Rodriguez Legarda A00405229
 
# Guia de uso aplicación de mensajería y llamadas:

## Guía de configuración de usuarios y host:

### Pasos para hacer pruebas en localhost con multiples consolas:
1) Correr el comando `gradle clean build`.
2) Correr el servidor con el comando: `java -cp server/build/classes/java/main Server 9090`.
3) Correr el cliente con el comando: `java -cp client/build/classes/java/main Client localhost 9090`.

    Corra tantos clientes como funcionalidades desee probar, tenga en cuenta que para probar mensajes, audios y llamadas entre usuarios se debe crear al menos 2 usuarios, para probar estas mismas funcionalidades debe crear al menos 3 usuarios.

4) Ingrese un nombre a su elección.



### Pasos para hacer pruebas en una red con multiples dispositivos:

1) Todos los dispositivos deben estar conectados en la misma red, si no es posible, intente conectandose a un movil hotspot con todos dispositivos.
2) Correr el comando `gradle clean build`.
3) Correr el servidor con el comando: `java -cp server/build/classes/java/main Server 9090`.
4) Correr el cliente con el comando: `java -cp client/build/classes/java/main Client (La IP de el dispositivo Host en la red a la que esten conectados) 9090`.

    Corra tantos clientes como funcionalidades desee probar, tenga en cuenta que para probar mensajes, audios y llamadas entre usuarios se debe crear al menos 2 usuarios, para probar estas mismas funcionalidades debe crear al menos 3 usuarios.

5) Ingrese un nombre a su elección.

## Guía de funcionalidades:

### Gestion de grupos:

#### Crear un grupo:

1) En el menú principal presione 1.

2) Ingrese el nombre del grupo.

3) Se ha creado el grupo, ahora usted como administrador del grupo podrá añadir cualquier usuario que quiera.

#### Añade un usuario a un grupo:

1) En el menú principal presione 2.

2) Ingrese el nombre del grupo al que desea añadir un usuario, recuerde que debe ser administrador del grupo (Haberlo creado).

3) Ingrese el nombre del usuario que desea añadir.

4) Se ha añadido el usuario al grupo, todo mensaje enviado al grupo le llegará al usuario.

### Enviar mensajes:

#### Enviar mensajes a otro usuario:

1) En el menú principal presione 3.

2) Ingrese el nombre del usuario al que quiere enviar el mensaje.

3) Ingrese el mensaje que desea enviar.

4) El usuario receptor del mensaje verá en su pantalla el mensaje que usted envió.

#### Enviar mensajes a un grupo:

1) En el menú principal presione 4.

2) Ingrese el nombre del grupo al que quiere enviar el mensaje.

3) Ingrese el mensaje que desea enviar.

4) Los usuarios receptores del mensaje verán en su pantalla el mensaje que usted envió.

### Enviar notas de voz:

#### Enviar notas de voz a otro usuario:

1) En el menú principal presione 5.

2) Ingrese el nombre del usuario al que quiere enviar la nota de voz.

3) Ingrese la duracion del mensaje `(Máximo 10s)`.

4) Instantaneamente se le mostrará que se está grabando el mensaje.

5) Los usuarios receptores del mensaje escucharan reproducirse automaticamente el mensaje que usted envió.

#### Enviar notas de voz a un grupo:

1) En el menú principal presione 6.

2) Ingrese el nombre del grupo al que quiere enviar la nota de voz.

3) Ingrese la duracion del mensaje `(Máximo 10s)`.

4) Instantaneamente se le mostrará que se está grabando el mensaje.

5) Los usuarios receptores del mensaje escucharan reproducirse automaticamente el mensaje que usted envió.

### Hacer llamadas:

#### Hacer llamada a otro usuario:

1) En el menú principal presione 7.

2) Ingrese el nombre del usuario de destino.

3) Se iniciará al instante la llamada `Tenga en cuenta que deben aceptarle la llamada, si la rechazan aquí termina el proceso`.

4) El usuario receptor deberá aceptar la llamada.

5) Los usuarios se escucharán entre si.

6) Cualquier usuario podrá terminar la llamada en cualquier momento.

#### Hacer llamada a un grupo:

1) En el menú principal presione 8.

2) Ingrese el nombre del grupo de destino.

3) Se iniciará al instante la llamada `Tenga en cuenta que deben aceptarle la llamada, si la rechazan aquí termina el proceso`.

4) Cada usuario receptor deberá aceptar la llamada.

5) Los usuarios se escucharán entre si.

6) Cualquier usuario podrá terminar la llamada en cualquier momento.

### Colgar llamadas:

#### Colgar llamada a otro usuario:

`Precondiciónn: debe estar en una llamada con otro usuario`

1) En el menú principal presione 9.

2) Ingrese el nombre del usuario a quien desea colgar la llamada.

3) Se colgó la llamada.

#### Colgar llamada a un grupo:

`Precondiciónn: debe estar en una llamada con un grupo`

1) En el menú principal presione 10.

2) Ingrese el nombre del grupo al cual desea colgar la llamada.

3) Se colgó la llamada.
