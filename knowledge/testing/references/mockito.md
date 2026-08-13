# Mockito — Templates AAA (Service / Repository)

## Patron Arrange-Act-Assert (AAA)

```java
@Test
void testProcesarLiquidacionExitoso() {
    // Arrange
    LiquidacionRequest request = buildRequest();
    LiquidacionEntity entity = buildEntity();
    when(xxxRepository.findById(1L)).thenReturn(Optional.of(entity));
    when(xxxClient.consultar(any())).thenReturn(buildResponse());

    // Act
    LiquidacionResult result = xxxService.procesar(request);

    // Assert
    assertThat(result).isNotNull();
    assertThat(result.getEstado()).isEqualTo(EstadoLiquidacion.PROCESADO);
    verify(xxxRepository, times(1)).findById(1L);
    verify(xxxClient, times(1)).consultar(any());
}
```

---

## Template: XxxServiceImpl Test

```java
/**
 * Tests unitarios para XxxServiceImpl.
 * Verifica el comportamiento de negocio aislando todas las dependencias externas.
 */
@ExtendWith(MockitoExtension.class)
class XxxServiceImplTest {

    @Mock
    private XxxRepository xxxRepository;

    @InjectMocks
    private XxxServiceImpl xxxService;

    @Captor
    private ArgumentCaptor<XxxEntity> entityCaptor;

    /**
     * Verifica que el procesamiento exitoso persiste la entidad con estado correcto.
     */
    @Test
    void testProcesarExitoso() {
        // Arrange
        Long id = 1L;
        XxxEntity entity = XxxEntity.builder().id(id).estado(Estado.PENDIENTE).build();
        when(xxxRepository.findById(id)).thenReturn(Optional.of(entity));
        doNothing().when(xxxRepository).save(any());

        // Act
        XxxResult result = xxxService.procesar(id);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(id);
        verify(xxxRepository).save(entityCaptor.capture());
        assertThat(entityCaptor.getValue().getEstado()).isEqualTo(Estado.PROCESADO);
    }

    /**
     * Verifica que se lanza XxxNotFoundException cuando la entidad no existe.
     */
    @Test
    void testProcesarConEntidadNoEncontrada() {
        // Arrange
        when(xxxRepository.findById(anyLong())).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> xxxService.procesar(99L))
                .isInstanceOf(XxxNotFoundException.class)
                .hasMessageContaining("99");

        verify(xxxRepository, never()).save(any());
    }

    /**
     * Verifica que un error de repositorio se propaga correctamente.
     */
    @Test
    void testProcesarConErrorRepositorio() {
        // Arrange
        when(xxxRepository.findById(anyLong()))
                .thenThrow(new DataAccessException("DB error") {});

        // Act & Assert
        assertThatThrownBy(() -> xxxService.procesar(1L))
                .isInstanceOf(DataAccessException.class);
    }
}
```

---

## Template: XxxRepository Test (JdbcTemplate mockeado)

```java
/**
 * Tests unitarios para XxxRepository.
 * Mockea JdbcTemplate para aislar la lógica SQL del repositorio.
 */
@ExtendWith(MockitoExtension.class)
class XxxRepositoryTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private XxxRepository xxxRepository;

    /**
     * Verifica que findById construye el query correcto y mapea el resultado.
     */
    @Test
    void testFindByIdExitoso() {
        // Arrange
        Long id = 42L;
        XxxEntity expected = XxxEntity.builder().id(id).build();
        when(jdbcTemplate.queryForObject(anyString(), any(RowMapper.class), eq(id)))
                .thenReturn(expected);

        // Act
        Optional<XxxEntity> result = xxxRepository.findById(id);

        // Assert
        assertThat(result).isPresent();
        assertThat(result.get().getId()).isEqualTo(id);
    }

    /**
     * Verifica que findById retorna Optional.empty() cuando no existe el registro.
     */
    @Test
    void testFindByIdNoEncontrado() {
        // Arrange
        when(jdbcTemplate.queryForObject(anyString(), any(RowMapper.class), anyLong()))
                .thenThrow(new EmptyResultDataAccessException(1));

        // Act
        Optional<XxxEntity> result = xxxRepository.findById(99L);

        // Assert
        assertThat(result).isEmpty();
    }
}
```

---

## Dependencias Gradle

```gradle
testImplementation 'org.junit.jupiter:junit-jupiter:5.11.0'
testImplementation 'org.mockito:mockito-junit-jupiter:5.12.0'
testImplementation 'org.assertj:assertj-core:3.26.0'
```
