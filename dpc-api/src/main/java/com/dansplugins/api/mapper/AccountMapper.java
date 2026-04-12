package com.dansplugins.api.mapper;

import com.dansplugins.api.dto.AccountResponse;
import com.dansplugins.api.entity.Account;
import com.dansplugins.api.entity.ApiKey;
import org.mapstruct.Mapper;

import java.util.List;

/**
 * MapStruct mapper for converting between {@link Account}/{@link ApiKey} entities
 * and {@link AccountResponse} DTOs.
 */
@Mapper(componentModel = "spring")
public interface AccountMapper {

    AccountResponse.ApiKeyInfo toApiKeyInfo(ApiKey apiKey);

    default AccountResponse toResponse(Account account, List<ApiKey> keys) {
        return new AccountResponse(
                account.getId(),
                account.getUsername(),
                account.getCreatedAt(),
                keys.stream().map(this::toApiKeyInfo).toList()
        );
    }
}
