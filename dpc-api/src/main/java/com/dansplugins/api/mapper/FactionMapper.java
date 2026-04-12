package com.dansplugins.api.mapper;

import com.dansplugins.api.dto.FactionResponse;
import com.dansplugins.api.entity.Faction;
import org.mapstruct.Mapper;

/**
 * MapStruct mapper for converting between {@link Faction} entities and {@link FactionResponse} DTOs.
 */
@Mapper(componentModel = "spring")
public interface FactionMapper {

    FactionResponse toResponse(Faction faction);
}
